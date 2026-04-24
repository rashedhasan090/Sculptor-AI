import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("benchmarks"),
    _creationTime: v.number(),
    name: v.string(),
    domain: v.string(),
    objectModelText: v.string(),
    numClasses: v.number(),
    numAssociations: v.number(),
    totalDesigns: v.number(),
    paretoOptimalCount: v.number(),
    description: v.string(),
  })),
  handler: async (ctx) => {
    return await ctx.db.query("benchmarks").collect();
  },
});

export const get = query({
  args: { id: v.id("benchmarks") },
  returns: v.union(v.object({
    _id: v.id("benchmarks"),
    _creationTime: v.number(),
    name: v.string(),
    domain: v.string(),
    objectModelText: v.string(),
    numClasses: v.number(),
    numAssociations: v.number(),
    totalDesigns: v.number(),
    paretoOptimalCount: v.number(),
    description: v.string(),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const seed = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("benchmarks").first();
    if (existing) return null;

    const benchmarks = [
      {
        name: "E-Commerce",
        domain: "ecommerce",
        objectModelText: `module ecommerce
open Declaration

one sig Customer extends Class{}{
attrSet = customerID
id=customerID
isAbstract = No
no parent
}
one sig customerID extends Integer{}
one sig Order extends Class{}{
attrSet = orderID
id=orderID
isAbstract = No
no parent
}
one sig orderID extends Integer{}
one sig CustomerOrderAssociation extends Association{}{
src = Customer
dst = Order
src_multiplicity = ONE
dst_multiplicity = MANY
}
one sig ShippingCart extends Class{}{
attrSet = shippingCartID
id=shippingCartID
isAbstract = No
no parent
}
one sig shippingCartID extends Integer{}
one sig CustomerShippingCartAssociation extends Association{}{
src = Customer
dst = ShippingCart
src_multiplicity = ONE
dst_multiplicity = MANY
}
one sig Item extends Class{}{
attrSet = ItemID+quantity
id=ItemID
isAbstract = No
no parent
}
one sig ItemID extends Integer{}
one sig quantity extends Integer{}
one sig CartItem extends Class{}{
attrSet = cartItemID
one parent
id=ItemID
isAbstract = No
parent in Item
}
one sig cartItemID extends Integer{}
one sig OrderItem extends Class{}{
attrSet = orderItemID+status
one parent
id=ItemID
isAbstract = No
parent in Item
}
one sig status extends Integer{}
one sig orderItemID extends Integer{}
one sig Category extends Class{}{
attrSet = categoryID+categoryName
id=categoryID
isAbstract = No
no parent
}
one sig categoryID extends Integer{}
one sig categoryName extends string{}
one sig Product extends Class{}{
attrSet = productID+productName+description+price
id=productID
isAbstract = No
no parent
}
one sig productID extends Integer{}
one sig productName extends string{}
one sig description extends string{}
one sig price extends Real{}
one sig ProductCategoryAssociation extends Association{}{
src = Product
dst = Category
src_multiplicity = MANY
dst_multiplicity = MANY
}
one sig Catalog extends Class{}{
attrSet = CatalogID
id=CatalogID
isAbstract = No
no parent
}
one sig CatalogID extends Integer{}
one sig ProductCatalogAssociation extends Association{}{
src = Product
dst = Catalog
src_multiplicity = ONE
dst_multiplicity = MANY
}
one sig PhysicalProduct extends Class{}{
attrSet = weight+availability
one parent
id=productID
isAbstract = No
parent in Product
}
one sig weight extends Real{}
one sig availability extends Bool{}
one sig ElectronicProduct extends Class{}{
attrSet = size
one parent
id=productID
isAbstract = No
parent in Product
}
one sig size extends string{}
one sig Service extends Class{}{
attrSet = schedule
one parent
id=productID
isAbstract = No
parent in Product
}
one sig schedule extends string{}
one sig Asset extends Class{}{
attrSet = assetID+assetName+fileURI
id = assetID
isAbstract = No
no parent
}
one sig assetID extends Integer{}
one sig assetName extends string{}
one sig fileURI extends string{}
one sig ProductAssetAssociation extends Association{}{
src = Product
dst = Asset
src_multiplicity = MANY
dst_multiplicity = MANY
}
one sig Media extends Class{}{
attrSet = mediaType
one parent
id = assetID
isAbstract = No
parent in Asset
}
one sig mediaType extends Integer{}
one sig Documents extends Class{}{
attrSet = excerpt
one parent
id = assetID
isAbstract = No
parent in Asset
}
one sig excerpt extends string{}
one sig ShippingCartItemAssociation extends Association{}{
src = ShippingCart
dst = Item
src_multiplicity = ONE
dst_multiplicity = MANY
}
one sig OrderItemAssociation extends Association{}{
src = Order
dst = Item
src_multiplicity = ONE
dst_multiplicity = MANY
}
one sig ProductItemAssociation extends Association{}{
src = Product
dst = Item
src_multiplicity = MANY
dst_multiplicity = MANY
}`,
        numClasses: 16,
        numAssociations: 8,
        totalDesigns: 2916,
        paretoOptimalCount: 7,
        description: "Full e-commerce platform with products, orders, shopping carts, catalogs, and digital assets."
      },
      {
        name: "Hospital Management",
        domain: "hospital",
        objectModelText: `module HospitalManagement
open Declaration

one sig Operation extends Class{}{
attrSet = OperationId+OperationDate
id=OperationId
no parent
isAbstract = No
}
one sig OperationId extends Integer{}
one sig OperationDate extends string{}
one sig Staff extends Class{}{
attrSet = StaffId+StaffName
id=StaffId
no parent
isAbstract = No
}
one sig StaffId extends Integer{}
one sig StaffName extends string{}
one sig Patient extends Class{}{
attrSet = PatientId+PatientName+PatientAge+PatientGender+PatientAddress+PatientMobileNo
id=PatientId
no parent
isAbstract = No
}
one sig PatientId extends Integer{}
one sig PatientName extends Integer{}
one sig Ward extends Class{}{
attrSet = WardId+WardName+WardNumber+status
id=WardNumber
no parent
isAbstract = No
}
one sig WardId extends string{}
one sig WardName extends string{}
one sig WardNumber extends Integer{}
one sig WardStaff extends Class{}{
attrSet = assignedWard
one parent
parent in Staff
id = StaffId
isAbstract = No
}
one sig assignedWard extends string{}
one sig Doctor extends Class{}{
attrSet = DoctorName+DoctorId+Qualification+Speciality
id=DoctorId
no parent
isAbstract = No
}
one sig DoctorName extends string{}
one sig DoctorId extends Integer{}
one sig Qualification extends string{}
one sig Speciality extends string{}
one sig Receptionist extends Class{}{
attrSet = ReceptionistInfo
one parent
parent in Staff
id = StaffId
isAbstract = No
}
one sig ReceptionistInfo extends string{}
one sig HospitalManagementSystem extends Class{}{
attrSet = HMSId+StaffType+StaffName+Qualification
id=HMSId
no parent
isAbstract = No
}
one sig HMSId extends Integer{}
one sig StaffType extends string{}
one sig StaffHMSAssociation extends Association{}{
src = HospitalManagementSystem
dst= Staff
src_multiplicity = ONE
dst_multiplicity = MANY
}
one sig StaffWardAssociation extends Association{}{
src = Staff
dst= Ward
src_multiplicity = MANY
dst_multiplicity = MANY
}
one sig HMSPatientAssociation extends Association{}{
src = HospitalManagementSystem
dst= Patient
src_multiplicity = ONE
dst_multiplicity = MANY
}
one sig HMSWardAssociation extends Association{}{
src = HospitalManagementSystem
dst= Ward
src_multiplicity = ONE
dst_multiplicity = MANY
}
one sig HMSDoctorAssociation extends Association{}{
src = HospitalManagementSystem
dst= Doctor
src_multiplicity = ONE
dst_multiplicity = ONE
}
one sig DoctorLibraryDbAssociation extends Association{}{
src = Doctor
dst= Operation
src_multiplicity = ONE
dst_multiplicity = ONE
}
one sig DoctorWardAssociation extends Association{}{
src = Doctor
dst= Ward
src_multiplicity = ONE
dst_multiplicity = MANY
}
one sig PatientLibraryDbAssociation extends Association{}{
src = Operation
dst= Patient
src_multiplicity = ONE
dst_multiplicity = MANY
}
one sig WardLibraryDbAssociation extends Association{}{
src = Operation
dst= Ward
src_multiplicity = ONE
dst_multiplicity = MANY
}
one sig StaffPatientAssociation extends Association{}{
src = Staff
dst= Patient
src_multiplicity = ONE
dst_multiplicity = ONE
}`,
        numClasses: 9,
        numAssociations: 10,
        totalDesigns: 2187,
        paretoOptimalCount: 6,
        description: "Hospital management system with staff, patients, wards, doctors, and operations."
      },
      {
        name: "Bank",
        domain: "bank",
        objectModelText: "module Bank\nopen Declaration\n\none sig Account extends Class{}{\nattrSet = accountID+balance\nid=accountID\nisAbstract = No\nno parent\n}\none sig accountID extends Integer{}\none sig balance extends Real{}\n\none sig Customer extends Class{}{\nattrSet = customerID+customerName\nid=customerID\nisAbstract = No\nno parent\n}\none sig customerID extends Integer{}\none sig customerName extends string{}\n\none sig SavingsAccount extends Class{}{\nattrSet = interestRate\none parent\nid=accountID\nisAbstract = No\nparent in Account\n}\none sig interestRate extends Real{}\n\none sig CheckingAccount extends Class{}{\nattrSet = overdraftLimit\none parent\nid=accountID\nisAbstract = No\nparent in Account\n}\none sig overdraftLimit extends Real{}\n\none sig Transaction extends Class{}{\nattrSet = transactionID+amount+date\nid=transactionID\nisAbstract = No\nno parent\n}\none sig transactionID extends Integer{}\none sig amount extends Real{}\none sig date extends string{}\n\none sig CustomerAccountAssociation extends Association{}{\nsrc = Customer\ndst = Account\nsrc_multiplicity = ONE\ndst_multiplicity = MANY\n}\n\none sig AccountTransactionAssociation extends Association{}{\nsrc = Account\ndst = Transaction\nsrc_multiplicity = ONE\ndst_multiplicity = MANY\n}",
        numClasses: 5,
        numAssociations: 2,
        totalDesigns: 729,
        paretoOptimalCount: 7,
        description: "Banking system with customers, accounts (savings/checking), and transactions."
      },
      {
        name: "University",
        domain: "university",
        objectModelText: "module University\nopen Declaration\n\none sig Student extends Class{}{\nattrSet = studentID+studentName+GPA\nid=studentID\nisAbstract = No\nno parent\n}\none sig studentID extends Integer{}\none sig studentName extends string{}\none sig GPA extends Real{}\n\none sig Course extends Class{}{\nattrSet = courseID+courseName+credits\nid=courseID\nisAbstract = No\nno parent\n}\none sig courseID extends Integer{}\none sig courseName extends string{}\none sig credits extends Integer{}\n\none sig Professor extends Class{}{\nattrSet = professorID+professorName+department\nid=professorID\nisAbstract = No\nno parent\n}\none sig professorID extends Integer{}\none sig professorName extends string{}\none sig department extends string{}\n\none sig GraduateStudent extends Class{}{\nattrSet = thesisTopic\none parent\nid=studentID\nisAbstract = No\nparent in Student\n}\none sig thesisTopic extends string{}\n\none sig StudentCourseAssociation extends Association{}{\nsrc = Student\ndst = Course\nsrc_multiplicity = MANY\ndst_multiplicity = MANY\n}\n\none sig ProfessorCourseAssociation extends Association{}{\nsrc = Professor\ndst = Course\nsrc_multiplicity = ONE\ndst_multiplicity = MANY\n}",
        numClasses: 4,
        numAssociations: 2,
        totalDesigns: 486,
        paretoOptimalCount: 5,
        description: "University system with students, courses, professors, and graduate programs."
      },
      {
        name: "Library",
        domain: "library",
        objectModelText: "module Library\nopen Declaration\n\none sig Book extends Class{}{\nattrSet = bookID+title+ISBN\nid=bookID\nisAbstract = No\nno parent\n}\none sig bookID extends Integer{}\none sig title extends string{}\none sig ISBN extends string{}\n\none sig Member extends Class{}{\nattrSet = memberID+memberName\nid=memberID\nisAbstract = No\nno parent\n}\none sig memberID extends Integer{}\none sig memberName extends string{}\n\none sig Loan extends Class{}{\nattrSet = loanID+dueDate\nid=loanID\nisAbstract = No\nno parent\n}\none sig loanID extends Integer{}\none sig dueDate extends string{}\n\none sig EBook extends Class{}{\nattrSet = fileFormat\none parent\nid=bookID\nisAbstract = No\nparent in Book\n}\none sig fileFormat extends string{}\n\none sig MemberLoanAssociation extends Association{}{\nsrc = Member\ndst = Loan\nsrc_multiplicity = ONE\ndst_multiplicity = MANY\n}\n\none sig LoanBookAssociation extends Association{}{\nsrc = Loan\ndst = Book\nsrc_multiplicity = MANY\ndst_multiplicity = ONE\n}",
        numClasses: 4,
        numAssociations: 2,
        totalDesigns: 324,
        paretoOptimalCount: 4,
        description: "Library management with books, members, loans, and digital formats."
      },
    ];

    for (const b of benchmarks) {
      await ctx.db.insert("benchmarks", b);
    }

    return null;
  },
});
